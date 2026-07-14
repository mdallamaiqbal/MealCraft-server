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
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
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