import mongoose from "mongoose";

const RETRY_MS = 10_000;

// Connects to MongoDB and keeps retrying if the network/DNS is down,
// so the server does not need a restart once the internet is back.
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, { serverSelectionTimeoutMS: 15_000 })
        console.log("db connect successfully")
    } catch (error) {
        console.log(`fail to connect (${error.code || error.name}: ${error.message}) - retrying in ${RETRY_MS / 1000}s`)
        setTimeout(connectDb, RETRY_MS)
    }
}

export default connectDb
