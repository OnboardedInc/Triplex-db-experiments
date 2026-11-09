import {makeRouteEquivalenceScenario,makeRouteEquivalenceCases} from "@triplex-build/triplex-testkit";
const scenario=makeRouteEquivalenceScenario(29);
if(scenario.groups.flat().length!==40)throw new Error("Missing seeded history");
const tests=makeRouteEquivalenceCases({seed:29,bases:[1],oracle:async()=>[{id:"one"}],advance:async()=>{},routes:[{id:"source",eligible:()=>true,refusals:[],read:async basis=>({rows:[{id:"one"}],route:"source",basis})}]});
const observations=await tests[0].run();
console.log(JSON.stringify({positions:scenario.groups.flat().length,subjects:scenario.subjects.length,observations}));
