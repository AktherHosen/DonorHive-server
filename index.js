const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const usersCollection = client.db("donorhive").collection("users");
    const blogsCollection = client.db("donorhive").collection("blogs");
    const donationRequstsCollection = client
      .db("donorhive")
      .collection("donation-requests");

    //jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    //verifyToken
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access." });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // all apis

    // make admin
    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const role = req.body;
      const updateDoc = {
        $set: role,
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      // Check if the requesting user is trying to access their own data
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized access" });
      }

      try {
        // Query to find the user by email
        const query = { email: email };
        const user = await usersCollection.findOne(query);

        if (user) {
          // Check the user's role and set it accordingly
          const role = user?.role || "donor"; // Default to 'donor' if no role is specified

          // Send back the user's role
          res.send({ role });
        } else {
          // If no user is found, return a 404 error
          res.status(404).send({ message: "User not found" });
        }
      } catch (err) {
        // Handle any potential errors during database operations
        res.status(500).send({ message: "Server error", error: err.message });
      }
    });

    // users api
    app.post("/users", async (req, res) => {
      const user = req.body;
      // check if user exist
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // get all user
    app.get("/users", verifyToken, async (req, res) => {
      const filter = req.query.filter || "";
      let query = {};
      if (filter && filter !== "") {
        query.status = filter;
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    //search donor
    app.get("/donors", async (req, res) => {
      const bloodGroup = req.query.bloodGroup || "";
      const district = req.query.district || "";
      const upozila = req.query.upozila || "";
      const query = {};

      if (bloodGroup && bloodGroup !== "") query.bloodGroup = bloodGroup;
      if (district && district !== "") query.district = district;
      if (upozila && query !== "") query.upozila = upozila;

      const donors = await usersCollection.find(query).toArray();
      res.send(donors);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const userInfo = req.body;
      const options = {
        upsert: true,
      };
      const updateDoc = {
        $set: {
          ...userInfo,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Blog
    app.get("/blogs", async (req, res) => {
      const filter = req.query.filter || "";
      let query = {};
      if (filter && filter !== "") {
        query.status = filter;
      }
      const result = await blogsCollection.find(query).toArray();
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

    // get specific user donation request and filter by status
    app.get("/donation-requests/:email", async (req, res) => {
      const email = req.params.email;
      const filter = req.query.filter || "";
      let query = { requesterEmail: email };
      if (filter && filter !== "") {
        query.status = filter;
      }
      try {
        const result = await donationRequstsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: "Error retrieving donation requests",
          error: err.message,
        });
      }
    });

    // create donation request
    app.post("/donation-request", async (req, res) => {
      const email = req.query.email;

      try {
        const user = await usersCollection.findOne({ email: email });
        if (user.status !== "active") {
          return res.status(403).send({
            message: "Sorry, you are blocked. You can't make a request.",
          });
        }
        const donationRequestInfo = req.body;
        const result = await donationRequstsCollection.insertOne(
          donationRequestInfo
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error" });
      }
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
      const { requesterEmail, status, ...donationInfo } = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: { ...donationInfo },
      };

      try {
        const result = await donationRequstsCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: "Error updating donation request",
          error: err.message,
        });
      }
    });

    app.delete("/donation-request/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequstsCollection.deleteOne(query);
      res.send(result);
    });

    // Update status of single blog
    // app.patch("/donation-request/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const status = req.body;
    //   const query = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: status,
    //   };
    //   const result = await donationRequstsCollection.updateOne(
    //     query,
    //     updateDoc
    //   );
    //   res.send(result);
    // });
    app.patch("/donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const { status, donorName, donorEmail } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
          donorName: donorName,
          donorEmail: donorEmail,
        },
      };

      try {
        const result = await donationRequstsCollection.updateOne(
          query,
          updateDoc
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: "Error updating donation request",
          error: err.message,
        });
      }
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
