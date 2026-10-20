import joi from "joi"

export const generalFields = {
    username: joi.string().min(3).max(30),
    email: joi.string().email(),
    password: joi.string().min(8).max(32).pattern(
        new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"\\\\|,.<>/?]).+$')
    ),
    rePassword: joi.string().valid(joi.ref('password')),
    layer: joi.string().messages({
    "any.required": "Layer is required",
    "string.empty": "Layer cannot be empty",
  }),

}

export const isValid = (schema) => {
    return (req, res, next) => {
        try {

            const data = { ...req.body, ...req.query, ...req.params }
            const { error } = schema.validate(data, { abortEarly: false, context: req })
            if (error) {
                const errArr = []
                error.details.forEach(err => errArr.push(err.message));
                return next(new Error(errArr, { cause: 400 }))
            }
            next()
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    }
}