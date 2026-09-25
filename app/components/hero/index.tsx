'use client';

import PoemFall from "../journey/PoemFall";
import ProgressGallery from "../journey/ProgressGallery";
import CloudContainer from "../models/Cloud";
import StarsContainer from "../models/Stars";
import WindowModel from "../models/WindowModel";
import TitleEmbroidery from "./TitleEmbroidery";

const Hero = () => {
  return (
    <>
      <TitleEmbroidery />
      <StarsContainer />
      <CloudContainer/>
      <ProgressGallery />
      <group position={[0, -25, 5.69]}>
        <pointLight castShadow position={[1, 1, -2.5]} intensity={60} distance={10}/>
        <WindowModel receiveShadow/>
      </group>
      <PoemFall />
    </>
  );
};

export default Hero;
