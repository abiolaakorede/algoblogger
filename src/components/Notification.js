import React from "react";
import { ToastContainer } from "react-toastify";

const Notification = () => (
  <ToastContainer
    position="bottom-center"
    autoClose={10000}
    hideProgressBar
    newestOnTop
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable={false}
    pauseOnHover
  />
);

export default Notification;
