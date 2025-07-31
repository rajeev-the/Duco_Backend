const mongoose = require("mongoose")

const PriceSchema = new mongoose.Schema({
    location : {
        type : String,
        required : true,
        unique : true,
        trim : true
    },
    price_increase : {
        type : Number,
        required : true,
        min : 0
    },
    time_stamp : {type : Date, default : Date.now}
})

module.exports = mongoose.model('PriceSchema',PriceSchema);
