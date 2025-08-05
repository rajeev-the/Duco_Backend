const express = require("express")

const app = express();
const conntectDb =  require("./DataBase/DBConnection")

const cors = require("cors")
//Routes of User
const UserRoute =  require("./Router/userRoute.js")

//Routes of User
const ProdcutsRoute = require("./Router/ProdcutsRoute")

//Routes 0f Category and SubCatgory 
const SubCategoryRoute = require("./Router/SubcatogryRoutes.js")
const CategoryRoute =  require("./Router/CategoryRoute.js")
const MoneyRoute = require("./Router/MoneyRoute.js")
const ImageKitRoute = require("./Router/imagekit.js")
const DesignRoute = require("./Router/DesignRoutes.js")
const skuRoute = require("./Router/skuRoute.js")
require('dotenv').config();


const port = process.env.PORT || 3000;





app.use(express.json());
app.use(cors());


conntectDb()

app.get('/' , (req,res)=>{
 
     res.send("hello")
})
app.use('/user',UserRoute)
app.use('/products',ProdcutsRoute)
app.use("/subcategory",SubCategoryRoute)
app.use("/category",CategoryRoute)
app.use("/money",MoneyRoute)
app.use('/api/imagekit', ImageKitRoute);
app.use('/api',DesignRoute ); // Add this line to include design routes
app.use("/api/sku/get",skuRoute)



app.listen(port,()=>{
    console.log("Connected Express")
})