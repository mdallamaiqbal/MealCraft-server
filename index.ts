import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { MongoClient, ObjectId } from 'mongodb';
const client = new MongoClient(process.env.MONGO_DB_URI as string);


const app: Application = express();
const port: string | number = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to MealCraft!');
});
interface FoodInput {
  name: string;
  price: number;
  category: string;
  description: string;
  image?: string;
}
export async function connectToMongoDB() {
  try {
    // await client.connect();
    const database = client.db("MealCraft_db");
    const foodCollection = database.collection<FoodInput>("foods");
    const cartCollection = database.collection("carts")
    app.post('/api/foods', async (req: Request<{}, {}, FoodInput>, res: Response) => {
      try {
        const food = req.body;

        if (!food || Object.keys(food).length === 0) {
          return res.status(400).json({ success: false, error: "Food data is required" });
        }

        const result = await foodCollection.insertOne(food);

        return res.status(201).json({ success: true, result });

      } catch (error) {
        console.error("Error inserting food item:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    });

    app.get('/api/foods', async (req: Request, res: Response) => {
      try {
        const foods = await foodCollection.find({}).sort({ _id: -1 }).toArray();
        return res.status(200).json({
          success: true,
          count: foods.length,
          data: foods
        });

      } catch (error) {
        console.error("Error fetching food items:", error);
        return res.status(500).json({
          success: false,
          error: "Internal Server Error"
        });
      }
    });
    app.get('/api/foods/:id', async (req: Request, res: Response) => {
      try {
        const id = req.params.id;
        if (typeof id !== "string") {
          return res.status(400).json({
            success: false,
            error: "Invalid Food ID parameter"
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            error: "Invalid Food ID format"
          });
        }

        const food = await foodCollection.findOne({ _id: new ObjectId(id) });

        if (!food) {
          return res.status(404).json({
            success: false,
            error: "Food item not found"
          });
        }

        return res.status(200).json({
          success: true,
          data: food
        });

      } catch (error) {
        console.error("Error fetching single food item:", error);
        return res.status(500).json({
          success: false,
          error: "Internal Server Error"
        });
      }
    });
    
    app.post('/api/cart', async (req: Request, res: Response) => {
      try {
        const { userId, foodId, quantity } = req.body;
        if (!userId || !foodId || quantity === undefined || quantity === null) {
          return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ success: false, error: "Invalid foodId format" });
        }

        const foodObjectId = new ObjectId(foodId);

        const existingCartItem = await cartCollection.findOne({
          userId: String(userId),
          foodId: foodObjectId
        });

        if (existingCartItem) {
          await cartCollection.updateOne(
            { _id: existingCartItem._id },
            { $inc: { quantity: Number(quantity) } }
          );
        } else {
          await cartCollection.insertOne({
            userId: String(userId),
            foodId: foodObjectId,
            quantity: Number(quantity)
          });
        }

        return res.status(200).json({ success: true, message: "Cart updated successfully" });
      } catch (error) {
        console.error("Error updating database cart:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    });

    
    app.get('/api/cart/:userId', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        if (!userId) {
          return res.status(400).json({ success: false, error: "Invalid User ID parameter" });
        }
        const cartItems = await cartCollection.aggregate([
          { $match: { userId: String(userId) } },
          {
            $lookup: {
              from: "foods",
              localField: "foodId",
              foreignField: "_id",
              as: "foodDetails"
            }
          },
          { $unwind: "$foodDetails" },
          {
            $project: {
              _id: "$foodDetails._id",
              cartItemId: "$_id",
              name: "$foodDetails.name",
              price: "$foodDetails.price",
              image: "$foodDetails.image",
              quantity: "$quantity" 
            }
          }
        ]).toArray();

        return res.status(200).json({ success: true, data: cartItems });
      } catch (error) {
        console.error("Error fetching cart items:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    });
    app.delete('/api/cart/:userId/:foodId', async (req: Request, res: Response) => {
      try {
        const { userId, foodId } = req.params;

        if (typeof userId !== "string" || typeof foodId !== "string") {
          return res.status(400).json({ success: false, error: "Invalid parameters" });
        }

        if (!ObjectId.isValid(foodId)) {
          return res.status(400).json({ success: false, error: "Invalid Food ID format" });
        }

        const result = await cartCollection.deleteOne({
          userId: String(userId),
          foodId: new ObjectId(foodId) 
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        return res.status(200).json({ success: true, message: "Item removed from cart successfully" });
      } catch (error) {
        console.error("Error deleting cart item:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    });
    return client;
  } catch (err) {
    console.dir(err);
  }
}
async function run() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`server is running on port ${port}`);
  });
}

run().catch(console.dir);