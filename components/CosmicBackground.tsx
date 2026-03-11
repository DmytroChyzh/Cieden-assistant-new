 "use client";

 import { useEffect, useMemo } from "react";

 /**
  * Cosmic animated background, adapted from the external Chatbot project.
  * Purely visual – no dependencies on that project's backend or contexts.
  */
 export default function CosmicBackground() {
   useEffect(() => {
     // Set a rich cosmic gradient on the body while this component is mounted
     document.body.style.background =
       "radial-gradient(ellipse at 20% 20%, #1e1b4b, #312e81, #1e1b4b, #000000 80%), linear-gradient(45deg, #0f0f23, #1a1a2e, #16213e)";
     document.body.style.overflow = "hidden";

     return () => {
       // Allow the rest of the app to manage body styles when this is unmounted
       document.body.style.overflow = "";
     };
   }, []);

   const starElements = useMemo(() => {
     const elements: any[] = [];

     // Small stars
     for (let i = 0; i < 150; i++) {
       elements.push({
         id: i,
         type: "small",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 4,
         duration: 1.5 + Math.random() * 2.5,
       });
     }

     // Medium stars
     for (let i = 0; i < 80; i++) {
       elements.push({
         id: `medium-${i}`,
         type: "medium",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 3,
         duration: 2 + Math.random() * 3,
       });
     }

     // Large stars
     for (let i = 0; i < 30; i++) {
       elements.push({
         id: `large-${i}`,
         type: "large",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 2,
         duration: 3 + Math.random() * 2,
       });
     }

     // Meteors
     for (let i = 0; i < 15; i++) {
       elements.push({
         id: `meteor-${i}`,
         type: "meteor",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 5,
         duration: 4 + Math.random() * 3,
       });
     }

     // Planets
     for (let i = 0; i < 3; i++) {
       elements.push({
         id: `planet-${i}`,
         type: "planet",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 6,
         duration: 5 + Math.random() * 3,
         size: 8 + Math.random() * 12,
         color: i === 0 ? "#8B5CF6" : i === 1 ? "#06B6D4" : "#F59E0B",
       });
     }

     // Nebulae
     for (let i = 0; i < 4; i++) {
       elements.push({
         id: `nebula-${i}`,
         type: "nebula",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 10,
         duration: 10 + Math.random() * 6,
         size: 150 + Math.random() * 300,
         color:
           i === 0
             ? "#8B5CF6"
             : i === 1
             ? "#06B6D4"
             : i === 2
             ? "#EC4899"
             : "#F59E0B",
       });
     }

     // Star clusters
     for (let i = 0; i < 3; i++) {
       const clusterStars = [];
       for (let j = 0; j < 8; j++) {
         clusterStars.push({
           id: `cluster-star-${i}-${j}`,
           left: Math.random() * 40 - 20,
           top: Math.random() * 40 - 20,
           delay: Math.random() * 3,
           duration: 2 + Math.random() * 2,
         });
       }
       elements.push({
         id: `cluster-${i}`,
         type: "cluster",
         left: Math.random() * 100,
         top: Math.random() * 100,
         stars: clusterStars,
       });
     }

     // Comets
     for (let i = 0; i < 2; i++) {
       elements.push({
         id: `comet-${i}`,
         type: "comet",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 12,
         duration: 6 + Math.random() * 4,
       });
     }

     // Pulsars
     for (let i = 0; i < 5; i++) {
       elements.push({
         id: `pulsar-${i}`,
         type: "pulsar",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 3,
         duration: 1 + Math.random() * 2,
       });
     }

     // Galactic dust
     for (let i = 0; i < 50; i++) {
       elements.push({
         id: `dust-${i}`,
         type: "dust",
         left: Math.random() * 100,
         top: Math.random() * 100,
         delay: Math.random() * 20,
         duration: 20 + Math.random() * 30,
       });
     }

     return elements;
   }, []);

   return (
     <div className="fixed inset-0 z-0 pointer-events-none">
       <div className="absolute inset-0">
         {starElements.map((element) => {
           switch (element.type) {
             case "small":
               return (
                 <div
                   key={element.id}
                   className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "medium":
               return (
                 <div
                   key={element.id}
                   className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "large":
               return (
                 <div
                   key={element.id}
                   className="absolute w-1.5 h-1.5 bg-white rounded-full animate-pulse"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "meteor":
               return (
                 <div
                   key={element.id}
                   className="absolute w-0.5 h-0.5 bg-blue-300 rounded-full animate-bounce"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "planet":
               return (
                 <div
                   key={element.id}
                   className="absolute rounded-full animate-pulse"
                   style={{
                     width: `${element.size}px`,
                     height: `${element.size}px`,
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     background: element.color,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "nebula":
               return (
                 <div
                   key={element.id}
                   className="absolute rounded-full opacity-15 animate-pulse"
                   style={{
                     width: `${element.size}px`,
                     height: `${element.size}px`,
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     background: `radial-gradient(ellipse, ${element.color}30, transparent 60%)`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "cluster":
               return (
                 <div
                   key={element.id}
                   className="absolute"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                   }}
                 >
                   {element.stars.map((star: any) => (
                     <div
                       key={star.id}
                       className="absolute w-0.5 h-0.5 bg-yellow-200 rounded-full animate-pulse"
                       style={{
                         left: `${star.left}px`,
                         top: `${star.top}px`,
                         animationDelay: `${star.delay}s`,
                         animationDuration: `${star.duration}s`,
                         willChange: "transform, opacity",
                       }}
                     />
                   ))}
                 </div>
               );
             case "comet":
               return (
                 <div
                   key={element.id}
                   className="absolute w-1 h-1 bg-cyan-300 rounded-full animate-bounce"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animationDelay: `${element.delay}s`,
                     animationDuration: `${element.duration}s`,
                     boxShadow:
                       "0 0 10px #06B6D4, 0 0 20px #06B6D4, 0 0 30px #06B6D4",
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "pulsar":
               return (
                 <div
                   key={element.id}
                   className="absolute w-1 h-1 bg-white rounded-full"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animation: `cosmic-pulsar ${element.duration}s ease-in-out infinite`,
                     animationDelay: `${element.delay}s`,
                     boxShadow:
                       "0 0 5px #ffffff, 0 0 10px #ffffff, 0 0 15px #ffffff",
                     willChange: "transform, opacity",
                   }}
                 />
               );
             case "dust":
               return (
                 <div
                   key={element.id}
                   className="absolute w-0.5 h-0.5 bg-gray-400 rounded-full opacity-30"
                   style={{
                     left: `${element.left}%`,
                     top: `${element.top}%`,
                     animation: `cosmic-drift ${element.duration}s linear infinite`,
                     animationDelay: `${element.delay}s`,
                     willChange: "transform, opacity",
                   }}
                 />
               );
             default:
               return null;
           }
         })}
       </div>
     </div>
   );
 }

