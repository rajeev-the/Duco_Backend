const mongoose = require("mongoose")

const  Banner= new mongoose.Schema({
    
    link: {
        type:String,
        require:true
    },
     link2: {
        type:String,
        require:true
    }
   

})


module.exports = mongoose.model("banner",Banner);