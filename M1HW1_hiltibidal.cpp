/*
CSC 134
M1HW1 - Gold
Hiltibidal
2026-03-23
*/
 
#include <iostream>
#include <string>
using namespace std;
 
int main()
{
    // Movie information variables
    string movieTitle = "The Crow";
    int releaseYear = 2024;
    double worldwideGross = 24.1; // in millions of dollars
 
    // Print movie summary using variables
    cout << "Movie: " << movieTitle << " (" << releaseYear << ")" << endl;
    cout << "Directed by Rupert Sanders, " << movieTitle << " is a gothic supernatural" << endl;
    cout << "superhero film and a reboot of the 1994 cult classic." << endl;
    cout << "It stars Bill Skarsgard as Eric Draven and FKA Twigs as Shelly." << endl;
    cout << "The film had a production budget of $50 million and grossed $" << worldwideGross << " million worldwide." << endl;
    cout << endl;
 
    // Quotes and interesting info (4-5 lines)
    cout << "Eric Draven describes his love for Shelly with this unforgettable line:" << endl;
    cout << "\"I loved her, you know? I loved her like an ocean loves water.\"" << endl;
    cout << "The mysterious guide Kronos tells Eric: \"The enemy of love is not hate. It's doubt.\"" << endl;
    cout << "One of the most interesting facts: Bradley Cooper, Jason Momoa, and Luke Evans" << endl;
    cout << "were all attached to play Eric Draven at different stages before Bill Skarsgard took the role." << endl;
 
    return 0;
}
 