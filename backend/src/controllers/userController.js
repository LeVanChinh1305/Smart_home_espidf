export const authMe = (req, res) => {
    return res.status(200).json({message: "User authenticated"});
};