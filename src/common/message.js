const generateMessage = (entity) => ({
    notFound: `${entity} not found`,
    alreadyExist: `${entity} already exist`,
    failToCreate: `fail to create ${entity}`,
    createdSuccessfully: `${entity} created Successfully`,
    updatedSuccessfully: `${entity} updated Successfully`,
    deletedSuccessfully: `${entity} deleted Successfully`,
    invalid: `${entity} invalid`
})


export const messages = {
    subCategory: generateMessage('subCategory'),
    product: generateMessage('product'),
    brand: generateMessage('brand'),
    unAuthorized: "you are not authorized",
    user: {
        ...generateMessage('user'),
        phone: "phone already exist",
        email: "email already exist",
        verifiedSuccessfully: "account verified successfully",
        login: "login successfully",
        invalidcrendential: "invalid credential",
        hasOTP: "you already has OTP",
        OTP: "check your email",
        invalidOTP: "invalid otp"
    }
}