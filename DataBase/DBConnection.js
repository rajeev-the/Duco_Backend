const mongoose = require("mongoose")
require('dotenv').config();

const dbUrl = process.env.DB_URL;
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