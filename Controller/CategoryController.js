const CategoryModel = require("../DataBase/Models/Category")

const SubCategoryModel = require("../DataBase/Models/subCategory")

const CreateCatogry =async(req, res)=>{
 
    const {category} = req.body;


    try {

        const ctg =  new CategoryModel({
            category:category,
           
        })
          const rt = await ctg.save();

          res.status(200).json({
            message:
                "Catgory is Created ",
                category:rt

          })
        
    } catch (error) {
        console.log(`Error in CraeteCatgoryController ${error}` )
         res.status(500).send({ message: "Fetching failed", error });
        
    }



}


const getallCatgory = async(req,res)=>{

    

    try {

        const ref = await CategoryModel.find();
        res.status(200).json({
            message:"Get All Category",
            category:ref
        })
        
    } catch (error) {
        console.log(`Error In getallCatgory : ${error}`)
           res.status(500).send({ message: "Fetching subcategories failed", error });

    }
}

const SubCreateCatogry =async(req, res)=>{
 
    const {subcatogry,categoryId  } = req.body;


    try {

        const ctg =  new SubCategoryModel({
            subcatogry:subcatogry,
            categoryId:categoryId
        })
          const rt = await ctg.save();

          res.status(200).json({
            message:
                "SubCatogry is Created ",
                category:rt

          })
        
    } catch (error) {
        console.log(`Error in CraeteCatgoryController ${error}` )
         res.status(500).send({ message: "Subcategory creation failed", error });
        
    }



}

const getallsubcategory = async (req,res)=>{

    try {

        const subCategory = await SubCategoryModel.find().populate("categoryId")
        res.status(200).json({
          message: "All SubCategories Fetched",
          subCategory,
            });
        
    } catch (error) {
         console.error("Error in getAllSubCategories:", error);
    res.status(500).send({ message: "Fetching subcategories failed", error });
        
    }
}
const getSubcategoriesByCategoryId = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const subcategories = await SubCategoryModel.find({ categoryId: categoryId });

    res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};



module.exports = {
        CreateCatogry,
        SubCreateCatogry,
        getallCatgory,
        getallsubcategory,
        getSubcategoriesByCategoryId
}