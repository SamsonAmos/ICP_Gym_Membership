import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';



type Gym = Record<{
    owner : Principal;
    id: string;
    gymName: string;
    gymImgUrl: string;
    gymLocation: string;
    members : Vec<string>;
    gymServices : Vec<GymService>;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type GymPayload = Record<{
    gymName: string;
    gymImgUrl: string;
    gymLocation: string;
}>



type GymService = Record<{
    id: string;
    serviceName: string;
    serviceDescription: string;
    createdAt: nat64;
}>

type GymServicePayload = Record<{
    serviceName: string;
    serviceDescription: string;
}>



const gymStorage = new StableBTreeMap<string, Gym>(0, 44, 1024);

// function to fetches all gyms created
$query;
export function fetchAllGyms(): Result<Vec<Gym>, string> {
    return Result.Ok(gymStorage.values());
}


// function to fetches a gym through its id
$query;
export function fetchGymById(id: string): Result<Gym, string> {
    return match(gymStorage.get(id), {
        Some: (gym) => Result.Ok<Gym, string>(gym),
        None: () => Result.Err<Gym, string>(`a gym with this id=${id} is not found`)
    });
}


// function to create a gym
$update;
export function createGym(payload: GymPayload): Result<Gym, string> {
    // const gym: Gym = { owner: ic.caller(), id: uuidv4(), members : [], gymServices : [], createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    
      // Validate payload
  if (!payload.gymName || !payload.gymImgUrl || !payload.gymLocation) {
    return Result.Err("Missing required fields");
  }

  // Create gym object
  const gym: Gym = {
    owner: ic.caller(),
    id: uuidv4(),
    members: [],
    gymServices: [],
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };
    
    gymStorage.insert(gym.id, gym);
    return Result.Ok(gym);
}

// function to add a gym service
$update;
export function addGymService (id: string, payload : GymServicePayload): Result<Gym, string> {
    const gymService: GymService = {id: uuidv4(), createdAt: ic.time(), ...payload };
    const gym = match(gymStorage.get(id), {
        Some: (gym) => {
            
            // checks if the caller is the same as the owner of the gym

            if(gym.owner.toString() !== ic.caller().toString()){
                return Result.Err<Gym, string>("You are not the owner of this gym")
            }
            
            const gymServices: Vec<any> = gym.gymServices; 
            
            gymServices.push(gymService);
            const Gym: Gym = {
                    ...gym,
                    gymServices: gymServices 
                }

            gymStorage.insert(gym.id, Gym);

            return Result.Ok<Gym, string>(Gym);
            
        },
        None: () => Result.Err<Gym, string>("Unable to carry out the following function")
    })

    return gym
}

// function to register for a gym
$update;
export function registerForAgym (id: string): Result<Gym, string> {
    const gym = match(gymStorage.get(id), {
        Some: (gym) => {

            const caller = ic.caller().toString()

            if(gym.members.includes(caller)) {
                return Result.Ok<Gym, string>(gym)
            } 
            else { 
            const members: Vec<string> = gym.members;
            members.push(caller);
            const Gym: Gym = {
                    ...gym,
                    members: members 
                }

            gymStorage.insert(gym.id, Gym);
            return Result.Ok<Gym, string>(Gym);
            }
        },
        None: () => Result.Err<Gym, string>("Error")
    })

    return gym
}


// function to update a gym by its id
$update;
export function updateGym(id: string, payload: GymPayload): Result<Gym, string> {
    if (!payload.gymName || !payload.gymImgUrl || !payload.gymLocation) {
        return Result.Err<Gym, string>("Invalid payload. Missing required fields.");
      }
      return match(gymStorage.get(id), {
        Some: (gym) => {
          const updatedGym: Gym = {
            ...gym,
            ...payload,
            updatedAt: Opt.Some(ic.time()),
          };
          gymStorage.insert(gym.id, updatedGym);
          return Result.Ok<Gym, string>(updatedGym);
        },
        None: () =>
          Result.Err<Gym, string>(
            `couldn't update the gym with this id=${id}. gym not found`
          ),
      });
}



//function that allows a gym owner to delete a gym
$update
export function deleteAGymById (id: string): Result<Gym, string> {
    return match(gymStorage.get(id), {
        Some: (deletedGym) => {
            // checks if the caller is the same as the owner of the gym
            if(deletedGym.owner.toString() !== ic.caller().toString()){
                return Result.Err<Gym, string>("You are not the owner of this gym")
            }
            gymStorage.remove(id)
            return Result.Ok<Gym, string>(deletedGym)
        },
        None: () => Result.Err<Gym, string>(`couldn't delete the gym with this id=${id}. gym not found.`)
    })
}


// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};