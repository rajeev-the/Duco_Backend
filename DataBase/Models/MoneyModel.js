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
    currency:{
        country:{
            type:String,
            required:true
        },
        toconvert:{
            type:Number,
            required:true
        }
    },
    time_stamp : {type : Date, default : Date.now}
})

module.exports = mongoose.model('PriceSchema',PriceSchema);
