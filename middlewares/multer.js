import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        const uploadDir = path.join(process.cwd(), "public");
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } catch (e) {
            return cb(e);
        }
        cb(null, uploadDir)
    },
    filename:(req,file,cb)=>{
        cb(null,`${Date.now()}-${file.originalname}`)
    }
})

export const upload = multer({storage})