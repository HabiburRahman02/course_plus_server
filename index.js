const express = require('express')
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken')
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
        const assignmentCollection = client.db('courseDB').collection('assignments');
        const usersCollection = client.db('courseDB').collection('users');


        // jwt related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '9h' })
            res.send({ token });
        })

        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded
                next();
            })
        }



        // user related apis
        app.get('/users', verifyToken, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = req.body;
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: 'already store this user in database' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // make admin
        app.patch('/user/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

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

        // assignment related apis
        app.post('/assignments', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
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