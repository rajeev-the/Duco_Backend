const mongoose = require("mongoose");



const BankDetails = new mongoose.Schema({

    bankdetails:{
        bankname:{
            type:String,
            require:true
        },
        accountnumber:{
            type:String,
            require:true
        },
        ifsccode:{
            type:String,
            require:true
        },
        branch:{
            type:String,
            require:true
        },
      
    },
    upidetails:{
        upiid:{
            type:String,
            require:true
        },
        upiname:{
            type:String,
            require:true
        },
    },
    isactive:{
        type:Boolean,
        require:true,
        default:false
    }
     

})

module.exports = mongoose.model("Bankdetails",BankDetails);