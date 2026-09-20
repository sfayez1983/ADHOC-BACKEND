export const globalErrorHandling = (error, req, res, next) => {

    console.log(error);
    return res.status(error.cause || 500).json({ message: error.message || error, success: false })
}