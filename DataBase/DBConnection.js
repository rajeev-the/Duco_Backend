require('dotenv').config();
const mongoose = require("mongoose")


const dbUrl = process.env.DB_URL;
console.log(dbUrl)
const conntectDb = async ()=>{
    
    try {

        const conn = await mongoose.connect(dbUrl,{
             useNewUrlParser: true,
      useUnifiedTopology: true,
        })
        console.log(`connection of mongoose ${conn.connection.host}`)
        
    } catch (error) {
        console.error(error)
        process.exit(1);
    }
}


module.exports = conntectDb