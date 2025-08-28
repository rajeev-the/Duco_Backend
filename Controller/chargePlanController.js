// controllers/chargePlanController.js
const ChargePlan = require("../models/DefaultChargePlan");

// ---------- helpers ----------
const toNum = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

function normalizeRange(raw, label) {
  const minqty = toNum(raw.minqty, `${label}.minqty`);
  const maxqty = toNum(raw.maxqty, `${label}.maxqty`);
  const cost   = toNum(raw.cost,   `${label}.cost`);

  if (minqty < 1) throw new Error(`${label}.minqty must be >= 1`);
  if (maxqty < minqty) throw new Error(`${label}.maxqty must be >= minqty`);
  if (cost < 0) throw new Error(`${label}.cost must be >= 0`);

  return { minqty, maxqty, cost };
}

function validateAndSortTiers(arr, keyName) {
  if (!Array.isArray(arr) || arr.length === 0)
    throw new Error(`${keyName} must be a non-empty array`);

  const tiers = arr.map((t, i) => normalizeRange(t, `${keyName}[${i}]`))
                   .sort((a, b) => a.minqty - b.minqty);

  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const cur  = tiers[i];
    if (cur.minqty <= prev.maxqty) {
      throw new Error(
        `${keyName} tiers overlap: tier ${i} minqty (${cur.minqty}) <= previous maxqty (${prev.maxqty})`
      );
    }
  }
  return tiers;
}

function findCostForQty(tiers, qty, label) {
  const hit = tiers.find(t => qty >= t.minqty && qty <= t.maxqty);
  if (!hit) throw new Error(`No matching ${label} tier for qty=${qty}`);
  return hit.cost;
}

async function getOrCreateSinglePlan() {
  let plan = await ChargePlan.findOne();
  if (!plan) {
    // Create a very safe baseline (0 cost, huge upper bound)
    plan = await ChargePlan.create({
      pakageingandforwarding: [{ minqty: 1, maxqty: 1_000_000_000, cost: 0 }],
      printingcost:           [{ minqty: 1, maxqty: 1_000_000_000, cost: 0 }],
      gst:                    [{ minqty: 1, maxqty: 1_000_000_000, cost: 0 }],
    });
  }
  return plan;
}

// ---------- controllers ----------
exports.getPlan = async (req, res) => {
  try {
    const plan = await getOrCreateSinglePlan();
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};

    if (body.pakageingandforwarding != null) {
      update.pakageingandforwarding = validateAndSortTiers(
        body.pakageingandforwarding,
        "pakageingandforwarding"
      );
    }
    if (body.printingcost != null) {
      update.printingcost = validateAndSortTiers(body.printingcost, "printingcost");
    }
    if (body.gst != null) {
      update.gst = validateAndSortTiers(body.gst, "gst");
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, error: "No valid fields to update." });
    }

    const plan = await getOrCreateSinglePlan();
    Object.assign(plan, update);
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.getRatesForQty = async (req, res) => {
  try {
    const qty = Number(req.query.qty ?? req.body?.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ success: false, error: "qty must be a number >= 1" });
    }

    const plan = await getOrCreateSinglePlan();
    const packaging = findCostForQty(plan.pakageingandforwarding, qty, "pakageingandforwarding");
    const printing  = findCostForQty(plan.printingcost, qty, "printingcost");
    const gst       = findCostForQty(plan.gst, qty, "gst");

    const perUnit = { pakageingandforwarding: packaging, printingcost: printing, gst };
    res.json({
      success: true,
      data: {
        qty,
        perUnit,
        perUnitTotal: packaging + printing + gst
      }
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.getTotalsForQty = async (req, res) => {
  try {
    const qty = Number(req.query.qty ?? req.body?.qty);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ success: false, error: "qty must be a number >= 1" });
    }

    const plan = await getOrCreateSinglePlan();
    const packaging = findCostForQty(plan.pakageingandforwarding, qty, "pakageingandforwarding");
    const printing  = findCostForQty(plan.printingcost, qty, "printingcost");
    const gst       = findCostForQty(plan.gst, qty, "gst");

    const perUnitTotal = packaging + printing + gst;
    res.json({
      success: true,
      data: {
        qty,
        perUnit: { pakageingandforwarding: packaging, printingcost: printing, gst },
        totals: {
          pakageingandforwarding: packaging * qty,
          printingcost: printing * qty,
          gst: gst * qty,
          grandTotal: perUnitTotal * qty
        }
      }
    });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};
