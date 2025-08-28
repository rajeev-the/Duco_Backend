// models/DefaultChargePlan.js
const mongoose = require("mongoose");


const ChargePlanSchema = new mongoose.Schema(

    {
       
        pakageingandforwarding: [ {
            minqty: { type: Number, required: true},
            maxqty: { type: Number, required: true},
            cost: { type: Number, required: true},
          
            }],
            printingcost :[ {
                minqty: { type: Number, required: true},
                maxqty: { type: Number, required: true},
                cost: { type: Number, required: true},
            }],
            gst: [{
              minqty: { type: Number, required: true},
              maxqty: { type: Number, required: true},
             cost: { type: Number, required: true},
            }]

       

    }
    
);

module.exports = mongoose.model("ChargePlan", ChargePlanSchema);
