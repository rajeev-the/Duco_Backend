const User = require('../DataBase/Models/UserModel');
const Otp = require("../DataBase/Models/OtpModel")
const sendOtpEmail =require("./sendMail")

 
// const signup = async (req, res) => {
//   const { number, name } = req.body;
//   const verified = true;

//   try {
//     const existingUser = await User.findOne({ number });

//     if (existingUser) {
//       return res.status(200).send({ message: "You already Exist" });
//     }

//     if (!verified) {
//       return res.status(401).send({ message: "Not verified" });
//     }

//     const user = await User.create({ number, name }); // <-- directly create
//     return res.status(201).send({ message: "User Created", user });

//   } catch (error) {
//     console.error('Signup error:', error);
//     res.status(500).send({ message: "Something went wrong", error });
//   }
// };


// const login = async(req,res)=>{
    
//     const {number} = req.body;

//     const data = await User.findOne({number : number});

//     if (data){
//         res.status(200).send({message : "login successfully" ,user:data});
//     }
//     else{
//         res.status(200).send({message:"Your Account doesn't exit"})
//     }
// }


// Add address to user's address array
const addAddressToUser = async (req, res) => {
  try {
    const { userId, newAddress } = req.body;

    if (!userId || !newAddress) {
      return res.status(400).json({ message: "userId and newAddress are required." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { address: newAddress } }, // Push new address into array
      { new: true, runValidators: true } // Return updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Address added successfully.",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Check if user already exists
    const user = await User.findOne({ email });

    // Save OTP in DB
    await Otp.create({ email, otp });

    // Send email with OTP
    await sendOtpEmail(email, otp);

    // Send response with user existence info
    return res.status(200).json({
      message: 'OTP sent to your Gmail',
      userExists: !!user, // true or false
    });
  } catch (err) {
    console.error('OTP send error:', err);
    return res.status(500).json({ message: 'Error sending OTP' });
  }
};

// 2. Verify OTP and Login/Signup
const verifyOtp = async (req, res) => {
  const { email, otp, name } = req.body;

  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  const validOtp = await Otp.findOne({ email, otp });

  if (!validOtp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({ email, name: name || "New User", isVerified: true });
  } else {
    user.isVerified = true;
    await user.save();
  }

  // Clean up used OTP
  await Otp.deleteMany({ email });

  return res.status(200).json({ message: 'Login/Signup successful', user });
};


module.exports = {
 
    addAddressToUser,
    sendOtp,
    verifyOtp
}


