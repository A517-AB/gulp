import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface FlyingJulesProps {
  state?: "idle" | "inProgress" | "completed" | "failed";
  size?: number;
  className?: string;
}

/**
 * `FlyingJules` displays an animated, SVG-based representation of Jules.
 * It is used for visual feedback or idle states (e.g., when no session is selected on JulesPage).
 *
 * Props:
 * - `state`: The animation state, e.g., "idle" or "thinking".
 * - `size`: The width and height in pixels.
 * - `className`: Optional CSS classes for styling.
 */
export function FlyingJules({ state = "idle", size = 64, className = "" }: FlyingJulesProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (state === "completed") {
      // Victory loop/spin
      void controls.start({
        rotate: [0, 360],
        y: [0, -20, 0],
        scale: [1, 1.15, 1],
        transition: { duration: 1.2, ease: "easeInOut" }
      });
    } else if (state === "failed") {
      // Sad droop
      void controls.start({
        y: [0, 15],
        rotate: [0, -15],
        transition: { type: "spring", bounce: 0.4, duration: 0.8 }
      });
    } else if (state === "inProgress") {
      // Faster, focused hover
      void controls.start({
        y: [0, -8, 0],
        rotate: [-2, 2, -2],
        transition: {
          y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
          rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        }
      });
    } else {
      // Normal slow drift
      void controls.start({
        y: [0, -5, 0],
        rotate: [-1, 1, -1],
        transition: {
          y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          rotate: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }
      });
    }
  }, [state, controls]);

  // Determine glow color and pulse duration
  const getGlowColor = () => {
    switch (state) {
      case "inProgress":
        return "bg-purple-500/30 shadow-purple-500/20";
      case "completed":
        return "bg-green-500/20 shadow-green-500/20";
      case "failed":
        return "bg-red-500/20 shadow-red-500/20";
      default:
        return "bg-zinc-500/10 shadow-zinc-500/5";
    }
  };

  const getEyeColor = () => {
    switch (state) {
      case "inProgress":
        return "#ffffff";
      case "completed":
        return "#4ade80";
      case "failed":
        return "#f87171";
      default:
        return "#ffffff";
    }
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Background Glow */}
      <motion.div
        animate={
          state === "inProgress"
            ? { scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }
            : state === "completed"
            ? { scale: [1, 1.05, 1], opacity: [0.4, 0.5, 0.4] }
            : { scale: 1, opacity: 0.3 }
        }
        transition={{
          repeat: Infinity,
          duration: state === "inProgress" ? 1.5 : 4,
          ease: "easeInOut"
        }}
        className={`absolute inset-0 rounded-full blur-xl transition-colors duration-500 ${getGlowColor()}`}
      />

      {/* Main Robot Avatar */}
      <motion.div
        animate={controls}
        className="relative z-10 w-full h-full select-none cursor-pointer"
        whileHover={{ scale: 1.08, filter: "brightness(1.1)" }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 100 100"
          width="100"
          height="100"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(178,163,255,0.25)]"
          style={{ width: '100%', height: '100%', transform: 'translate3d(0px, 0px, 0px)', contentVisibility: 'visible' }}
        >
          <defs>
            <clipPath id="__lottie_element_2">
              <rect width="100" height="100" x="0" y="0" />
            </clipPath>
            <clipPath id="__lottie_element_12">
              <path fill="#ffffff" clipRule="nonzero" d=" M12.005999565124512,-1.2109999656677246 C4.644999980926514,-1.2109999656677246 -1.3209999799728394,5.184000015258789 -1.3209999799728394,12.541999816894531 C-1.3209999799728394,19.899999618530273 4.644999980926514,26.239999771118164 12.005999565124512,26.239999771118164 C19.367000579833984,26.239999771118164 25.333999633789062,19.899999618530273 25.333999633789062,12.541999816894531 C25.333999633789062,5.184000015258789 19.367000579833984,-1.2109999656677246 12.005999565124512,-1.2109999656677246" />
            </clipPath>
            <clipPath id="__lottie_element_15">
              <path fill="#ffffff" clipRule="nonzero" />
            </clipPath>
            <clipPath id="__lottie_element_18">
              <path fill="#ffffff" clipRule="nonzero" d=" M12.005999565124512,-1.2109999656677246 C4.644999980926514,-1.2109999656677246 -1.3209999799728394,5.184000015258789 -1.3209999799728394,12.541999816894531 C-1.3209999799728394,19.899999618530273 4.644999980926514,26.239999771118164 12.005999565124512,26.239999771118164 C19.367000579833984,26.239999771118164 25.333999633789062,19.899999618530273 25.333999633789062,12.541999816894531 C25.333999633789062,5.184000015258789 19.367000579833984,-1.2109999656677246 12.005999565124512,-1.2109999656677246" fillOpacity="1" />
            </clipPath>
            <clipPath id="__lottie_element_21">
              <path fill="#ffffff" clipRule="nonzero" d=" M12.005999565124512,-1.2050000429153442 C4.644999980926514,-1.2050000429153442 -1.3209999799728394,5.189000129699707 -1.3209999799728394,12.54699993133545 C-1.3209999799728394,29.725000381469727 -1.309999942779541,29.68199920654297 12.005999565124512,29.68199920654297 C25.267000198364258,29.68199920654297 25.333999633789062,29.725000381469727 25.333999633789062,12.54699993133545 C25.333999633789062,5.189000129699707 19.367000579833984,-1.2050000429153442 12.005999565124512,-1.2050000429153442" fillOpacity="1" />
            </clipPath>
          </defs>
          <g clipPath="url(#__lottie_element_2)">
            <g clipPath="url(#__lottie_element_21)" transform="matrix(2.9488537311553955,0,0,3.0511465072631836,14.736625671386719,11.86067008972168)" opacity="1" style={{ display: 'block' }}>
              <g opacity="1" transform="matrix(1,0,0,1,3.946000099182129,18.51300048828125)">
                <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="rgb(143,122,247)" strokeOpacity="1" strokeWidth="2.3" d=" M-2.275158643722534,6.569880485534668 C-2.2633962631225586,6.838935852050781 -1.0955451726913452,6.797986030578613 -0.0010000000474974513,6.2216386795043945 C1.0506329536437988,5.675872802734375 2.2829999923706055,3.878000020980835 2.2829999923706055,2.617000102996826 C2.2829999923706055,2.617000102996826 2.2829999923706055,-4.8979997634887695 2.2829999923706055,-4.8979997634887695" />
              </g>
              <g opacity="1" transform="matrix(1,0,0,1,-0.375,0)">
                <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="rgb(143,122,247)" strokeOpacity="1" strokeWidth="2.3" d=" M10.5,13.625 C10.5,13.625 10.479000091552734,18.794326782226562 10.5,22.732328414916992" />
              </g>
              <g opacity="1" transform="matrix(1,0,0,1,0.375,0)">
                <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="rgb(143,122,247)" strokeOpacity="1" strokeWidth="2.3" d=" M13.541999816894531,13.583000183105469 C13.541999816894531,13.583000183105469 13.564000129699707,18.305328369140625 13.541999816894531,22.732328414916992" />
              </g>
              <g opacity="1" transform="matrix(1,0,0,1,20.05500030517578,18.51300048828125)">
                <path strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" stroke="rgb(143,122,247)" strokeOpacity="1" strokeWidth="2.3" d=" M-2.2829999923706055,-3.3469998836517334 C-2.2829999923706055,-0.753000020980835 -2.2829999923706055,2.617000102996826 -2.2829999923706055,2.617000102996826 C-2.2829999923706055,3.878000020980835 -1.1980524063110352,5.763697147369385 -0.01233048364520073,6.1988983154296875 C0.6200000047683716,6.420000076293945 1.6549999713897705,6.734000205993652 2.3440001010894775,6.874000072479248" />
              </g>
            </g>
            <g clipPath="url(#__lottie_element_18)" transform="matrix(2.9488537311553955,0,0,3.0511465072631836,14.613757133483887,11.86067008972168)" opacity="1" style={{ display: 'block' }}>
              <g opacity="1" transform="matrix(1,0,0,1,12,8.472000122070312)">
                <path fill="rgb(143,122,247)" fillOpacity="1" d=" M0,-8.062000274658203 C-4.004000186920166,-8.062000274658203 -7.25,-4.815999984741211 -7.25,-0.8119999766349792 C-7.25,-0.8119999766349792 -7.25,-0.35100001096725464 -7.25,-0.35100001096725464 C-7.25,-0.35100001096725464 -7.25,0.5910000205039978 -7.25,0.5910000205039978 C-7.25,0.5910000205039978 -7.25,5.886000156402588 -7.25,5.886000156402588 C-7.25,7.0879998207092285 -6.275000095367432,8.062000274658203 -5.072999954223633,8.062000274658203 C-5.072999954223633,8.062000274658203 5.072999954223633,8.062000274658203 5.072999954223633,8.062000274658203 C6.275000095367432,8.062000274658203 7.25,7.0879998207092285 7.25,5.886000156402588 C7.25,5.886000156402588 7.25,0.5910000205039978 7.25,0.5910000205039978 C7.25,0.5910000205039978 7.25,-0.35100001096725464 7.25,-0.35100001096725464 C7.25,-0.35100001096725464 7.25,-0.8119999766349792 7.25,-0.8119999766349792 C7.25,-4.815999984741211 4.004000186920166,-8.062000274658203 0,-8.062000274658203z M-3.8399999141693115,4.872859477996826 C-4.474999904632568,4.872859477996826 -4.989999771118164,4.287850379943848 -4.989999771118164,3.5480000972747803 C-4.989999771118164,2.801624298095703 -4.474999904632568,2.2231404781341553 -3.8399999141693115,2.2231404781341553 C-3.2049999237060547,2.2231404781341553 -2.6908419132232666,2.8038344383239746 -2.690000057220459,3.5480000972747803 C-2.6896841526031494,4.290060520172119 -3.2049999237060547,4.872859477996826 -3.8399999141693115,4.872859477996826z M3.8399999141693115,4.872859477996826 C3.2049999237060547,4.872859477996826 2.6908419132232666,4.290060520172119 2.690000057220459,3.5480000972747803 C2.69189453125,2.802781820297241 3.2049999237060547,2.2231404781341553 3.8399999141693115,2.2231404781341553 C4.474999904632568,2.2231404781341553 4.989999771118164,2.8082547187805176 4.989999771118164,3.5480000972747803 C4.991052627563477,4.28237771987915 4.474999904632568,4.872859477996826 3.8399999141693115,4.872859477996826z" />
                <motion.g
                  animate={{
                    scaleY: [1, 1, 0.1, 1, 1, 1, 0.1, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4.8,
                    ease: "easeInOut",
                    times: [0, 0.44, 0.46, 0.48, 0.88, 0.90, 0.92, 1]
                  }}
                  style={{ originX: 0, originY: 3.548 }}
                >
                  <path
                    fill={getEyeColor()}
                    d="M-3.8399999141693115,4.872859477996826 C-4.474999904632568,4.872859477996826 -4.989999771118164,4.287850379943848 -4.989999771118164,3.5480000972747803 C-4.989999771118164,2.801624298095703 -4.474999904632568,2.2231404781341553 -3.8399999141693115,2.2231404781341553 C-3.2049999237060547,2.2231404781341553 -2.6908419132232666,2.8038344383239746 -2.690000057220459,3.5480000972747803 C-2.6896841526031494,4.290060520172119 -3.2049999237060547,4.872859477996826 -3.8399999141693115,4.872859477996826z"
                  />
                  <path
                    fill={getEyeColor()}
                    d="M3.8399999141693115,4.872859477996826 C3.2049999237060547,4.872859477996826 2.6908419132232666,4.290060520172119 2.690000057220459,3.5480000972747803 C2.69189453125,2.802781820297241 3.2049999237060547,2.2231404781341553 3.8399999141693115,2.2231404781341553 C4.474999904632568,2.2231404781341553 4.989999771118164,2.8082547187805176 4.989999771118164,3.5480000972747803 C4.991052627563477,4.28237771987915 4.474999904632568,4.872859477996826 3.8399999141693115,4.872859477996826z"
                  />
                </motion.g>
              </g>
            </g>
          </g>
        </svg>

        {/* Thruster Flame/Sparkles for Progress State */}
        {state === "inProgress" && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <motion.div
              animate={{
                height: [6, 14, 6],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.25,
                ease: "easeInOut",
              }}
              className="w-1.5 bg-gradient-to-b from-purple-400 via-indigo-500 to-transparent rounded-full blur-[1px]"
            />
            <motion.div
              animate={{
                y: [0, 8],
                opacity: [0.8, 0],
                scale: [1, 0.5],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.4,
                ease: "easeOut",
              }}
              className="w-1 h-1 bg-purple-300 rounded-full mt-0.5"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
