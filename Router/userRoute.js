const express = require("express")

const router = express.Router();
const {sendOtp ,verifyOtp ,addAddressToUser} = require("../Controller/UserController")

 
router.get('/',(req,res)=>{
   
    res.send("User Route BACKend")
})



router.post('/send-otp', sendOtp)
router.post('/verify-otp', verifyOtp);
router.post('/add-address', addAddressToUser);



module.exports = router