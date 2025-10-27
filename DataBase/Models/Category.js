const mongoose = require("mongoose")

const Category = new mongoose.Schema({
    
    category:{
        type:String,
        require:true
    },
      icon: { type: String}
   

})


module.exports = mongoose.model("Category",Category);