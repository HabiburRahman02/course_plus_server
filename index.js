const express = require('express')
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken')
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

// middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://courseplus-b5b5c.web.app",
        "https://courseplus-b5b5c.firebaseapp.com",
    ],
    credentials: true,
}))
app.use(express.json())
// console.log(stripe);




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster3.ggy8e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster3`

// console.log(uri);
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
        const teacherCollection = client.db('courseDB').collection('teachers');
        const enrollCollection = client.db('courseDB').collection('enrolls');
        const submissionCollection = client.db('courseDB').collection('assignmentSubmission');


        // jwt related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '9h' })
            res.send({ token });
        })

        // middlewares
        const verifyToken = async (req, res, next) => {
            // console.log('token', req.headers.authorization);
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

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }



        // user related apis
        app.get('/userSpecific/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        // app.get('/allUsers', verifyToken,verifyAdmin, async (req, res) => {
        //     const result = await usersCollection.find().toArray();
        //     res.send(result);
        // })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // console.log('email', req.decoded.email);
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
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

        app.patch('/updateUser/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    name: user?.name,
                    image: user?.photoUrl
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // make admin
        app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        app.patch('/user/teacher/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    role: 'teacher'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/user/student/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    role: 'student'
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

        app.get('/allCourses', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        })

        app.get('/course/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const result = await courseCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/courses', async (req, res) => {
            const {sortOrder} = req.query;
            const sortStyle = sortOrder === 'asc' ? {price : 1} : {price: -1}
            const result = await courseCollection.
            find({ status: "approved" })
            .sort(sortStyle)
            .toArray();
            res.send(result);
        })

        app.get('/specificCourseForUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query)
            res.send(result)
        })

        app.patch('/courseForEnrollId/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $inc: {
                    totalEnrollment: 1
                }
            }
            const result = await courseCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.get('/popular-courses', async (req, res) => {
            const filter = {
                status: 'approved'
            }
            const result = await courseCollection
                .find(filter)
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

        app.patch('/allCoursesApproved/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await courseCollection.updateOne(query, updatedDoc);
            res.send(result)
        })

        app.patch('/allCoursesRejected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'rejected'
                }
            }
            const result = await courseCollection.updateOne(query, updatedDoc);
            res.send(result)
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
        app.get('/assignmentsByCourseId/:id', async (req, res) => {
            const id = req.params.id;
            const query = { courseId: id };
            const result = await assignmentCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/assignment/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.findOne(query);
            res.send(result)
        })

        app.post('/assignments', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        })

        app.patch('/assignments/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $inc: {
                    submissionCount: 1
                }
            }
            const result = await assignmentCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // assignmentSubmission
        app.post('/assignmentSubmission', async (req, res) => {
            const submission = req.body;
            const result = await submissionCollection.insertOne(submission);
            res.send(result);
        })



        // teachers related apis
        app.get('/teacherByEmail/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await teacherCollection.findOne(query);
            res.send(result);
        })

        app.get('/teachers', async (req, res) => {
            const result = await teacherCollection.find().toArray();
            res.send(result);
        })

        app.post('/teachers', async (req, res) => {
            const teacher = req.body;
            const result = await teacherCollection.insertOne(teacher)
            res.send(result);
        })

        app.patch('/allTeacherApproved/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await teacherCollection.updateOne(query, updatedDoc);
            res.send(result)
        })
        app.patch('/allTeacherRejected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'rejected'
                }
            }
            const result = await teacherCollection.updateOne(query, updatedDoc);
            res.send(result)
        })

        app.patch('/requestForPending/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updatedDoc = {
                $set: {
                    status: 'pending'
                }
            }
            const result = await teacherCollection.updateOne(query, updatedDoc);
            res.send(result)
        })





        // feedback related apis
        app.get('/feedbacks', async (req, res) => {
            const result = await feedbackCollection
                .find()
                .limit(10)
                .toArray();
            res.send(result);
        })

        app.post('/feedbacks', async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.send(result)
        })


        // my enroll course related apis
        app.get('/enrollByEnrollId/:id', async (req, res) => {
            const id = req.params.id;
            const query = { enrollId: id };
            const result = await enrollCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/enroll/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId };
            const result = await enrollCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/myEnrollCourse/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await enrollCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/myEnrollCourse', verifyToken, async (req, res) => {
            const course = req.body;
            const result = await enrollCollection.insertOne(course);
            res.send(result);
        })




        // payment related apis
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            console.log('amount from intent', amount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // count for apis
        app.get('/countForApi', async (req, res) => {
            const userCount = await usersCollection.estimatedDocumentCount();
            const courseCount = await courseCollection.estimatedDocumentCount();
            const enrollCount = await enrollCollection.estimatedDocumentCount();

            res.send({ userCount, courseCount, enrollCount })
        })


        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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