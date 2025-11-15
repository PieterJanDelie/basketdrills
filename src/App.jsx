import React from "react";
import Home from "./pages/Home/Home";
import TrainingSession from "./pages/TrainingSession/TrainingSession";
import Trainings from "./pages/Trainings/Trainings";
import SharedTraining from "./pages/Trainings/SharedTraining";
import Cursus from "./pages/Cursus/Cursus";
import DataEntry from "./pages/DataEntry/DataEntry";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./pages/PageNotFound";
import { CartProvider } from "./contexts/CartContext";

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/sessie" element={<TrainingSession />} />
          <Route path="/trainingen" element={<Trainings />} />
          <Route path="/share/:id" element={<SharedTraining />} />
          <Route path="/cursus" element={<Cursus />} />
          <Route path="/data" element={<DataEntry />} />
          <>Not found</>
          <Route path="/*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </CartProvider>
  )
  
}

export default App;
