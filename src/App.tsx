import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import SinglePlayer from "./pages/SinglePlayer";
import MultiPlayer from "./pages/MultiPlayer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/single" element={<SinglePlayer />} />
        <Route path="/multi" element={<MultiPlayer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
