import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';
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
    await client.connect();
    const database = client.db("MealCraft_db");
    const foodCollection = database.collection<FoodInput>("foods");
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