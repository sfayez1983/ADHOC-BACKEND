export const globalErrorHandling = (error, req, res, next) => {

    console.log(error);
    return res.status(Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500).json({ message: error.message || error, success: false })
}