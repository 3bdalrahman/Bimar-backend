import express from "express";
import mongoose from "mongoose";
import Appointments from "../models/AppointmentsModel.js";
import jwt from "jsonwebtoken";
import errorHandler from "../utilities/errorHandler.js";

const getAnalytics = async (
  doctorId,
  startDate = null,
  endDate = null,
  groupByMonth = false
) => {
  const matchStage = { 
    doctorId: new mongoose.Types.ObjectId(doctorId),
    status: "Completed" // Only include completed appointments
  };
  if (startDate && endDate) {
    matchStage.appointmentDate = { $gte: startDate, $lte: endDate };
  }

  const pipeline = [
    { $match: matchStage }, // Match appointments for the doctor, date range, and completed status
  ];

  // Group by month if required
  if (groupByMonth) {
    pipeline.push({
      $group: {
        _id: { $month: "$appointmentDate" }, // Group by month
        totalPatients: { $sum: 1 }, // Count total patients
        totalMoney: { $sum: "$Price" }, // Sum the Price field from completed Appointments
      },
    });
    pipeline.push({ $sort: { _id: 1 } }); // Sort by month (1-12)
  } else {
    pipeline.push({
      $group: {
        _id: null, // No grouping, aggregate all
        totalPatients: { $sum: 1 }, // Count total patients
        totalMoney: { $sum: "$Price" }, // Sum the Price field from completed Appointments
      },
    });
  }

  const result = await Appointments.aggregate(pipeline);

  // If grouping by month, ensure all months (1-12) exist
  if (groupByMonth) {
    return Array(12)
      .fill(null)
      .map((_, index) => {
        const monthData = result.find((r) => r._id === index + 1);
        return {
          month: index + 1,
          totalPatients: monthData ? monthData.totalPatients : 0,
          totalMoney: monthData ? monthData.totalMoney : 0,
        };
      });
  }

  return result[0] || { totalPatients: 0, totalMoney: 0 };
};

const getDailyAnalytics = async (req, res) => {
  try {
    // Get doctorId from token instead of params
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) throw "Unauthorized: Only doctors can access their analytics";
    
    const doctorId = decoded.userId;
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const analytics = await getAnalytics(doctorId, startOfDay, endOfDay);
    res.status(200).json(analytics);
  } catch (error) {
    console.log("Error in getDailyAnalytics:", error);
    errorHandler(res, error);
  }
};

const getWeeklyAnalytics = async (req, res) => {
  try {
    // Get doctorId from token instead of params
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) throw "Unauthorized: Only doctors can access their analytics";
    
    const doctorId = decoded.userId;
    
    const today = new Date();

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);

    const analytics = await getAnalytics(
      doctorId,
      firstDayOfWeek,
      lastDayOfWeek
    );
    res.status(200).json(analytics);
  } catch (error) {
    console.log("Error in getWeeklyAnalytics:", error);
    errorHandler(res, error);
  }
};

const getMonthlyAnalytics = async (req, res) => {
  try {
    // Get doctorId from token instead of params
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) throw "Unauthorized: Only doctors can access their analytics";
    
    const doctorId = decoded.userId;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const analytics = await getAnalytics(
      doctorId,
      firstDayOfMonth,
      lastDayOfMonth
    );
    console.log(analytics);
    res.status(200).json(analytics);
  } catch (error) {
    console.log("Error in getMonthlyAnalytics:", error);
    errorHandler(res, error);
  }
};

const getYearlyAnalytics = async (req, res) => {
  try {
    // Get doctorId from token instead of params
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) throw "Unauthorized: Only doctors can access their analytics";
    
    const doctorId = decoded.userId;
    
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const analytics = await getAnalytics(
      doctorId,
      firstDayOfYear,
      lastDayOfYear,
      true
    );
    res.status(200).json(analytics);
  } catch (error) {
    console.log("Error in getYearlyAnalytics:", error);
    errorHandler(res, error);
  }
};

const getTotalAnalytics = async (req, res) => {
  try {
    // Get doctorId from token instead of params
    const token = req.cookies.jwt;
    if (!token) throw "Token not provided";

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Check if the user is a doctor (not an admin)
    if (decoded.isAdmin) throw "Unauthorized: Only doctors can access their analytics";
    
    const doctorId = decoded.userId;
    
    const analytics = await getAnalytics(doctorId);
    res.status(200).json(analytics);
  } catch (error) {
    console.log("Error in getTotalAnalytics:", error);
    errorHandler(res, error);
  }
};

export default {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getTotalAnalytics,
};
