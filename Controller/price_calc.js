const Price = require("../DataBase/Models/MoneyModel.js");

/* -------------------------------------------------------------------------- */
/* 🧩 1. Get updated prices by location                                       */
/* -------------------------------------------------------------------------- */
const getUpdatePricesByLocation = async (req, res) => {
  console.log("📍 getUpdatePricesByLocation hit!");

  const { location } = req.body;

  try {
    if (!location || location === "Unknown") {
      return res.status(400).json({ message: "Invalid or missing location" });
    }

    // Case-insensitive search in both location and aliases
    const ref = await Price.findOne({
      $or: [
        { location: { $regex: new RegExp(location, "i") } },
        { aliases: { $regex: new RegExp(location, "i") } },
      ],
    });

    if (!ref) {
      return res
        .status(404)
        .json({ message: `No price rule found for ${location}` });
    }

    return res.status(200).json({
      success: true,
      location: ref.location,
      aliases: ref.aliases,
      percentage: ref.price_increase,
      currency: ref.currency, // { country, rate }
    });
  } catch (error) {
    console.error("❌ Error in getUpdatePricesByLocation:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧩 2. Create or update price entry                                         */
/* -------------------------------------------------------------------------- */
const createOrUpdatePriceEntry = async (req, res) => {
  try {
    const { location, price_increase, currency, aliases } = req.body;

    if (
      !location ||
      price_increase === undefined ||
      !currency ||
      !currency.country ||
      !currency.toconvert
    ) {
      return res.status(400).json({
        message: "Location, price_increase, and currency details are required",
      });
    }

    let entry = await Price.findOne({ location });

    if (entry) {
      // Update
      entry.price_increase = price_increase;
      entry.currency = currency;
      entry.aliases = aliases || []; // ✅ add aliases
      await entry.save();

      return res.status(200).json({
        success: true,
        message: `Entry updated for ${location}`,
        data: entry,
      });
    } else {
      // Create
      const newEntry = new Price({
        location,
        price_increase,
        currency,
        aliases: aliases || [], // ✅ add aliases
      });
      await newEntry.save();

      return res.status(201).json({
        success: true,
        message: `New entry created for ${location}`,
        data: newEntry,
      });
    }
  } catch (error) {
    console.error("❌ Error in createOrUpdatePriceEntry:", error);
    return res.status(500).json({ message: "Server not responding" });
  }
};

/* -------------------------------------------------------------------------- */
/* 🧩 3. Get all price entries                                                */
/* -------------------------------------------------------------------------- */
const getAllPrices = async (req, res) => {
  try {
    const prices = await Price.find().sort({ time_stamp: -1 });
    return res.status(200).json(prices);
  } catch (error) {
    console.error("❌ Error in getAllPrices:", error);
    return res
      .status(500)
      .json({ message: "Server error while retrieving prices" });
  }
};

module.exports = {
  getUpdatePricesByLocation,
  createOrUpdatePriceEntry,
  getAllPrices,
};
