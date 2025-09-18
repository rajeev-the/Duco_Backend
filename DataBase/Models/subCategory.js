const mongoose = require("mongoose")

const  subCatogry = new  mongoose.Schema({

     subcatogry:{
        type:String,
        require:true,
     },
      categoryId :[
             {
                 type:mongoose.Schema.Types.ObjectId,ref:"Category"
                 
             }
         ]
    

})

// module.exports = mongoose.model("Subcatogry",subCatogry)

module.exports = mongoose.model("Subcategory", subCatogry, "subcatogries");
