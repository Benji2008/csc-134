/*
M7T1 - Restaurant Ratings
First OOP code
hiltibidal
4/27/26
*/

#include <iostream>
using namespace std;

// Restaurant class -- could go in its own Restaurant.h
class Restaurant {
    private:
     string name;       // name of restaurant
     double rating;     // 1.0 - 5.0, including half stars
    public:
     Restaurant(string n, double r); // constructor
     void setName(string n);
     void setRating(double r);
     string getName() const;
     double getRating() const;
     void display() const; 

};

// Restaurant functions -- could go in Restaurant.h or .cpp
Restaurant::Restaurant(string n, double r) {
    // constructor
    name = n;
    rating = r;
}

void Restaurant::setName(string n) {
    name = n;
}

void Restaurant::setRating(double r) {
    rating = r;
}

string Restaurant::getName() const {
    return name;
}

double Restaurant::getRating() const {
    return rating;
}

void Restaurant::display() const {
    cout << name << ": ";
    
    // Cast the double to an int to get the number of solid whole stars
    int fullStars = static_cast<int>(rating); 
    
    // Determine if there is a remainder of 0.5 or greater
    bool hasHalfStar = (rating - fullStars) >= 0.5;

    // Print the full star emojis
    for (int i = 0; i < fullStars; i++) {
        cout << "⭐";
    }

    // Print a half-star representation. 
    // Since standard emojis don't have a clean "half star", 
    // we use a sparkle emoji here. You could also use a standard '½' character.
    if (hasHalfStar) {
        cout << " ½";
    }

    // Print the numerical value for clarity at the end
    cout << " (" << rating << "/5)" << endl;

}

// main
int main() {
    // Quick test
    string name;
    double rating;

    cout << "Restaurant Review" << endl;
    cout << "Enter restaurant name: "; 
    getline(cin, name);
    cout << "Enter restaurant rating: ";
    cin >> rating;

    Restaurant rest1 = Restaurant(name, rating);
    //cout << rest1.getName() << endl;
    //cout << rest1.getRating() << endl;
    rest1.display();
}