const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  operationSuccessStatus: 200,
};
const app = express();
app.use(express.json());
app.use(cors(corsOptions));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bmhyihx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // collections
    const blogsCollection = client.db("donorhive").collection("blogs");
    const donationRequstsCollection = client
      .db("donorhive")
      .collection("donation-requests");
    // all apis

    // Blog
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // only published blog will fetched blog page
    app.get("/all-blogs", async (req, res) => {
      const status = req.query.status;
      let query = {};
      if (status === "published") {
        query = { status: "published" };
      }

      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    });

    // Post Blog
    app.post("/blog", async (req, res) => {
      const blogInfo = req.body;
      const result = await blogsCollection.insertOne(blogInfo);
      res.send(result);
    });
    // Get Single Blog
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    // Update status of single blog
    app.patch("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await blogsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Delete blog
    app.delete("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    });

    // get all donation request
    app.get("/donation-requests", async (req, res) => {
      const result = await donationRequstsCollection.find().toArray();
      res.send(result);
    });
    app.get("/blood-donation-requests", async (req, res) => {
      const status = req.query.status;
      let query = {};
      if (status === "pending") {
        query = { status: "pending" };
      }

      const result = await donationRequstsCollection.find(query).toArray();
      res.send(result);
    });

    // get specific user donation request by email
    app.get("/donation-requests/:email", async (req, res) => {
      const email = req.params.email;
      const query = { requesterEmail: email };
      const result = await donationRequstsCollection.find(query).toArray();
      res.send(result);
    });
    // create donation request
    app.post("/donation-request", async (req, res) => {
      const donationRequestInfo = req.body;
      const result = await donationRequstsCollection.insertOne(
        donationRequestInfo
      );
      res.send(result);
    });

    app.get("/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequstsCollection.findOne(query);
      res.send(result);
    });

    // donation request update data
    app.put("/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const donationInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: { ...donationInfo },
      };
      const result = await donationRequstsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/donation-request/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequstsCollection.deleteOne(query);
      res.send(result);
    });

    // Update status of single blog
    app.patch("/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await donationRequstsCollection.updateOne(
        query,
        updateDoc
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Donor hive server is running");
});
app.listen(port, () => {
  console.log(`Donor hive server is running on port ${port}`);
});
