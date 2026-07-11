// "use client";

// import { useEffect, useState } from "react";
// import { getWidth, getHeight, getRim, Option } from "../../services/tyreService";

// export default function SearchBySize() {

//     const [widthList, setWidthList] = useState<Option[]>([]);
//     const [heightList, setHeightList] = useState<Option[]>([]);
//     const [rimList, setRimList] = useState<Option[]>([]);

//     const [width, setWidth] = useState("");
//     const [height, setHeight] = useState("");
//     const [rim, setRim] = useState("");


//     useEffect(() => {

//         loadWidth();

//     }, []);


//     const loadWidth = async () => {

//         const data = await getWidth();

//         setWidthList(data);

//     };


//     const handleWidthChange = async (value: string) => {

//         setWidth(value);

//         setHeight("");
//         setRim("");

//         const heightData = await getHeight(value);

//         setHeightList(heightData);

//     };


//     const handleHeightChange = async (value: string) => {

//         setHeight(value);

//         setRim("");

//         const rimData = await getRim(width, value);

//         setRimList(rimData);

//     };



//     const handleSearch = () => {

//         window.location.href =
//             `/product-list?width=${width}&height=${height}&rim=${rim}`;

//     };



//     return (

//         <div className="main-search mt-10">

//             <div className="search-wrap search-by-size">

//                 <form>

//                     <ul className="list-custom flex justify-center items-center gap-3 flex-wrap">

//                         <li>

//                             <span className="bg-primary px-6 py-2 rounded font-semibold">

//                                 Search by Size

//                             </span>

//                         </li>



//                         {/* WIDTH */}

//                         <li>

//                             <select

//                                 className="border px-4 py-2 rounded w-[160px]"

//                                 value={width}

//                                 onChange={(e) => handleWidthChange(e.target.value)}

//                             >

//                                 <option value="">Width</option>

//                                 {widthList.map((item) => (

//                                     <option key={item.value} value={item.value}>

//                                         {item.label}

//                                     </option>

//                                 ))}

//                             </select>

//                         </li>



//                         {/* HEIGHT */}

//                         <li>

//                             <select

//                                 className="border px-4 py-2 rounded w-[160px]"

//                                 value={height}

//                                 onChange={(e) => handleHeightChange(e.target.value)}

//                             >

//                                 <option value="">Height</option>

//                                 {heightList.map((item) => (

//                                     <option key={item.value} value={item.value}>

//                                         {item.label}

//                                     </option>

//                                 ))}

//                             </select>

//                         </li>



//                         {/* RIM */}

//                         <li>

//                             <select

//                                 className="border px-4 py-2 rounded w-[160px]"

//                                 value={rim}

//                                 onChange={(e) => setRim(e.target.value)}

//                             >

//                                 <option value="">Rim</option>

//                                 {rimList.map((item) => (

//                                     <option key={item.value} value={item.value}>

//                                         {item.label}

//                                     </option>

//                                 ))}

//                             </select>

//                         </li>



//                         {/* SEARCH */}

//                         <li>

//                             <button

//                                 type="button"

//                                 onClick={handleSearch}

//                                 className="bg-primary px-6 py-2 rounded font-semibold"

//                             >

//                                 Search

//                             </button>

//                         </li>


//                     </ul>

//                 </form>

//             </div>

//         </div>

//     );

// }