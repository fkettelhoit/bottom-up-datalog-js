# Bottom-Up Datalog (in < 100 lines)

Did you ever wish for a (horribly inefficient) bottom-up implementation of Datalog that you could run in your browser? Well, you have come to the right place then! (And yes, the implementation really is very naive. But short. And simple.)

## How it works

Right now every query simply builds up a complete database of facts first, by taking each applicable rule, matching it against the known facts and then adding the solutions (if any) to the existing facts. This is repeated as long as new facts can be added this way and then the database is complete. Now we only need to check if our query unifies with any fact. Sounds not exactly smart? It isn't. But it's simple and easy to understand.

## Future plans

I'll probably add stratification checks in the future. We'll see... And negation would be nice, too.