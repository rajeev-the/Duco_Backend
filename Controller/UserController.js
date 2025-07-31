const User = require('../DataBase/Models/UserModel');

 
const signup = async (req, res) => {
  const { number, name } = req.body;
  const verified = true;

  try {
    const existingUser = await User.findOne({ number });

    if (existingUser) {
      return res.status(200).send({ message: "You already Exist" });
    }

    if (!verified) {
      return res.status(401).send({ message: "Not verified" });
    }

    const user = await User.create({ number, name }); // <-- directly create
    return res.status(201).send({ message: "User Created", user });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).send({ message: "Something went wrong", error });
  }
};


const login = async(req,res)=>{
    
    const {number} = req.body;

    const data = await User.findOne({number : number});

    if (data){
        res.status(200).send({message : "login successfully" ,user:data});
    }
    else{
        res.status(200).send({message:"Your Account doesn't exit"})
    }
}


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



module.exports = {
    signup,
    login,
    addAddressToUser
}


