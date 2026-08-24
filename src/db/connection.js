import mongoose from "mongoose";

const connectDb = async () => {
    mongoose.connect(process.env.DB_URL)
        .then(() => console.log("db connect successfully"))
        .catch(error => console.log("fail to connect", error))

}

export default connectDb