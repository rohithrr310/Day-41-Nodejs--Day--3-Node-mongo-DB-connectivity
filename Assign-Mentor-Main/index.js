require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

app.use(cors());
app.use(express.json());

const URL = process.env.ATLAS_URI;
mongoose
  .connect(URL)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((err) => {
    console.error(err);
  });

//creating schema

const mentorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assignedStudents: [
    {
      type: mongoose.Types.ObjectId,
      ref: "student",
    },
  ],
});

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assignedMentor: {
    type: mongoose.Types.ObjectId,
    ref: "mentor",
  },
  previousMentor: {
    type: mongoose.Types.ObjectId,
    ref: "mentor",
  },
});

//creating model

const MentorModel = mongoose.model("Mentor", mentorSchema, "mentors");

const StudentModel = mongoose.model("Students", studentSchema, "students");

// api endpoint for home page

app.get("/", (req, res) => {
  res.send("<h1>Mentor and Student Assigning with Database</h1>");
});

/*------------------------------------------------------------*/

// 01 api endpoint for getting all students details

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/student
*/

app.get("/student", (req, res) => {
  StudentModel.find({}, {}).then((student) => {
    res.status(200).json(student);
  });
});

// api endpoint for creating students details

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/student
body: 
{"name":"superman"}
*/

app.post("/student", async (req, res) => {
  try {
    let newStudent = new StudentModel(req.body);
    if (!newStudent.name) {
      return res.status(404).json({
        message: "Invalid student data",
      });
    }
    newStudent = newStudent.save();
    res.status(200).json({ message: "New student added Successfully" });
  } catch (error) {
    res
      .status(404)
      .json({ Err: "Failed to create new student, please enter valid data" });
  }
});

/*------------------------------------------------------------*/

// 02 api endpoint for getting all mentors details

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/mentor
*/

app.get("/mentor", (req, res) => {
  MentorModel.find({}, {}).then((mentor) => {
    res.status(200).json(mentor);
  });
});

// api endpoint for creating new Mentors

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/mentor
body: 
{"name":"aktar"}
*/

app.post("/mentor", async (req, res) => {
  try {
    let newMentor = new MentorModel(req.body);
    if (!newMentor.name) {
      return res.status(404).json({
        message: "Invalid mentor data",
      });
    }
    newMentor = newMentor.save();
    res.status(200).json({ message: "New mentor added Successfully" });
  } catch (error) {
    console.error(error);
  }
});

/*------------------------------------------------------------*/

// 03 api endpoint for assigning a student to mentor

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/mentor/64b0131ae06556b8fc27499c/student/64b01246e06556b8fc274994
*/

app.post("/mentor/:mentorId/student/:studentId", async (req, res) => {
  try {
    const { mentorId, studentId } = req.params;
    const mentor = await MentorModel.findById(mentorId);
    const student = await StudentModel.findById(studentId);

    if (!student || !mentor) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!mentor.assignedStudents) {
      mentor.assignedStudents = [];
    }
    if (student.assignedMentor) {
      student.previousMentor = student.assignedMentor;
    }

    mentor.assignedStudents.push(student);
    student.assignedMentor = mentor;
    await mentor.save();
    await student.save();
    res
      .status(200)
      .json({ message: "student assigned to mentor successfully" });
  } catch (error) {
    console.log(error);
  }
});

/*------------------------------------------------------------*/

// 04 api endpoint for reassigning mentor to specific student

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/student/64b01246e06556b8fc274994/mentor/64b0130fe06556b8fc274998
*/

app.put("/student/:studentId/mentor/:mentorId", async (req, res) => {
  const { studentId, mentorId } = req.params;
  try {
    const student = await StudentModel.findById(studentId);
    let mentor = await MentorModel.findById(student.assignedMentor);
    if (student.assignedMentor) {
      mentor.assignedStudents = mentor.assignedStudents.filter(
        (e) => e != student.assignedMentor
      );
      await mentor.save();
    }
    mentor = await MentorModel.findById(mentorId);
    if (!student || !mentor) {
      return res.status(404).json({ message: "Not found" });
    }
    if (student.assignedMentor) {
      student.previousMentor = student.assignedMentor;
    }
    if (!mentor.assignedStudents) {
      mentor.assignedStudents = [];
    }
    mentor.assignedStudents.push(student);
    student.assignedMentor = mentor;
    await mentor.save();
    await student.save();
    res.status(200).json({ message: "student reassigned successfully" });
  } catch (error) {
    console.log(error);
  }
});

/*------------------------------------------------------------*/

// 05 api endpoint for showing students of a mentor

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/mentor/64b0130fe06556b8fc274998/studentList
https://assign-mentor-wljm.onrender.com/mentor/64b01315e06556b8fc27499a/studentList
*/

app.get("/mentor/:mentorId/studentList", async (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentor = await MentorModel.findById(mentorId);
    if (!mentor) return res.status(404).json({ error: "not found" });
    let mentorsStudent = {
      Name: `${mentor.name}`,
      StudentList: `${mentor.assignedStudents}`,
    };
    return res.status(200).json(mentorsStudent);
  } catch (error) {
    console.log(error);
  }
});

/*------------------------------------------------------------*/

//06 api endpoint to show previous mentor for a particular student

/*
for checking purpose in postman
https://assign-mentor-wljm.onrender.com/student/64b01230e06556b8fc27498f/previousMentor
https://assign-mentor-wljm.onrender.com/student/64b0123ce06556b8fc274992/previousMentor
*/

app.get("/student/:studentId/previousMentor", async (req, res) => {
  try {
    const { studentId } = req.params;
    if (studentId.length != 24) {
      return res.status(404).json({ error: "Student records not found" });
    }
    const student = await StudentModel.findById(studentId);
    if (!student.previousMentor) {
      return res
        .status(200)
        .json({ Message: "no previous mentor for this student" });
    }
    let PreviousMentor = {
      "Student Name": `${student.name}`,
      "Previous Mentor": `${student.previousMentor}`,
    };
    res.status(200).json(PreviousMentor);
  } catch (error) {
    console.log(error);
  }
});

/*------------------------------------------------------------*/

app.listen(3000, () => {
  console.log("server is running");
});
