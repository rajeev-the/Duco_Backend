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


const paymentRoute = require("./Router/paymentRoutes.js")
const completedorderRoutes = require("./Router/CompletedOrderRoutes.js")
const orderRoutes = require("./Router/orderRoutes.js")
const analytics = require("./Router/analytics")

const { addToStorage,
  getStorage,
  clearStorage,
  removeByValue,} = require("./Data/storage")
require('dotenv').config();


const port = process.env.PORT || 3000;





app.use(express.json({ limit: '2mb' }));
app.use(cors());


conntectDb()


// => { sku: 'MStRnHs-Wh-S', description: 'Male Standard Crew T-Shirt | US21 White S' }





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
app.use("/api/payment",paymentRoute)
app.use("/api",completedorderRoutes)
app.use("/api",orderRoutes)
app.use("/api",analytics)
app.get("/api/ip", async (req, res) => {
  const response = await fetch("http://ip-api.com/json");
  const data = await response.json();
  res.json(data);
});



//storage of Banner data 

// List all strings
app.get("/api/strings", (req, res) => {
  res.json({ storage: getStorage() });
});

// Add a string
app.post("/api/strings", (req, res) => {
  try {
    const { text } = req.body;
    addToStorage(text);
    res.status(201).json({
      message: "Added",
      storage: getStorage(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove by exact value (body: { text: "..." })
app.delete("/api/strings", (req, res) => {
  try {
    const { text, all } = req.body || {};
    if (all === true) {
      clearStorage();
      return res.json({ message: "All cleared", storage: getStorage() });
    }
    if (typeof text !== "string") {
      return res.status(400).json({
        error: "Provide { text } to remove or { all: true } to clear all",
      });
    }
    const removedCount = removeByValue(text);
    res.json({
      message: "Removed by value",
      removedCount,
      storage: getStorage(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




app.listen(port,()=>{
    console.log("Connected Express")
})