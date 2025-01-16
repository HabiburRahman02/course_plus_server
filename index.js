const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster3.ggy8e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster3`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const courseCollection = client.db('courseDB').collection('courses');
        const feedbackCollection = client.db('courseDB').collection('feedbacks');


        // course related apis
        app.post('/courses', async (req, res) => {
            const course = req.body;
            const result = await courseCollection.insertOne(course)
            res.send(result);
        })

        app.get('/course/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const result = await courseCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/courses', async (req, res) => {
            const result = await courseCollection.find({ status: "approved" }).toArray();
            res.send(result);
        })

        app.get('/specificCourseForUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query)
            res.send(result)
        })

        app.get('/course/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await courseCollection.findOne(query);
            res.send(result);
        })

        app.get('/popular-courses', async (req, res) => {
            const result = await courseCollection
                .find()
                .sort({ totalEnrollment: -1 })
                .limit(4)
                .toArray()
            res.send(result);
        })

        app.patch('/updateCourse/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const course = req.body;
            const updateDoc = {
                $set: course
            }
            const result = await courseCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/courseDelete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.deleteOne(query);
            res.send(result);
        })

        // total class, total ass, total submission count
        app.get('/courseCount/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const courses = await courseCollection.find(query).toArray();
            const totalEnrollment = courses.reduce((acc, course) => acc + course.totalEnrollment, 0);
            res.send({ totalEnrollment })
        })

        // feedback related apis
        app.get('/feedbacks', async (req, res) => {
            const result = await feedbackCollection.find().toArray();
            res.send(result);
        })



        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Course plus is running!')
})

app.listen(port, () => {
    console.log(`Course plus is running! on port ${port}`)
})