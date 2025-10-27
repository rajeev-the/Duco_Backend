const express = require("express")

const router = express.Router();
const {sendOtp ,verifyOtp ,addAddressToUser,getUser} = require("../Controller/UserController")

 
router.get('/',(req,res)=>{
   
    res.send("User Route BACKend")
})



router.post('/send-otp', sendOtp)
router.post('/verify-otp', verifyOtp);
router.post('/add-address', addAddressToUser);
router.get("/get",getUser);



module.exports = router