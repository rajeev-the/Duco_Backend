
const Price = require('../DataBase/Models/MoneyModel.js');

const getUpdatePricesByLocation = async (req,res) => {
    const {location} = req.body;

    try{

        if (!location){
            return res.status(400).json({message: 'Location is missing'});
        }

        const ref = await Price.findOne({location : location});
        const increased_percentage = ref?.price_increase

        return res.status(200).json({
            percentage : increased_percentage
        });
    } catch (error){
        console.error('Error calculating updated prices :',error);
        return res.status(500).json({message : 'Server error'});
    }
};


const createOrUpdatePriceEntry = async(req,res) => {
    try { 
        const {location,price_increase} = req.body;

        if (!location || price_increase === undefined){
            return res.status(400).json({message : 'Location and price_increase are required'});
        }


        let entry = await Price.findOne({location : location});

        if (entry){

            entry.price_increase = price_increase;
            await entry.save();

            return res.status(200).json({
                message :`Entry updated for location ${location} successfully` ,
                data : entry
            })
        }
        else{
            const newEntry = new Price({
            location,
            price_increase
        })
        await newEntry.save();
        
        return res.status(201).json({
            message : "Price entry created Successfully",
            data : newEntry
        });
        }
    }catch(error){
        console.error("Error occured :",error);
        return res.status(500).json({message : 'server not responding'});
    }
};


const getAllPrices = async (req, res) => {
  try {
    const prices = await Price.find().sort({ time_stamp: -1 }); // newest first
    res.status(200).json(prices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({ message: "Server error while retrieving prices" });
  }
}

module.exports = {getUpdatePricesByLocation ,createOrUpdatePriceEntry ,getAllPrices};