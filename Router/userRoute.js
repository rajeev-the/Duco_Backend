const express = require("express")

const router = express.Router();
const {signup ,login ,addAddressToUser} = require("../Controller/UserController")

 
router.get('/',(req,res)=>{
   
    res.send("User Route BACKend")
})



router.post('/signup', signup)
router.post('/login',login) 
router.post('/add-address', addAddressToUser);



module.exports = router