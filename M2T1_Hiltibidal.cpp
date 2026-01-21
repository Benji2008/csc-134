//csc 134
// M2t1 user store - sales
//Connor Hiltibidal 
//1/14/26
//as a store owner my goal is to sell things and make $$$.
/*
were selling food - you decide what you wanna sell
tell me how much you have
how much each costs
and what your total would be.
if we have time we'll make it more interactive
*/
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    string item_name;
    int item_count;
    int purchased;
double price_each ;
double total_price;

//part 1 set up the store
cout << " Welcome to the store setup program. " << endl;
cout << "Name of item? ";
getline(cin, item_name); //let us use spaces?
cout << "number of items? ";
cin >> item_count;
cout << "price each? ";
cin >> price_each;

cout << endl << "------" << endl; // separator
cout << setprecision(2) << fixed;

cout << "welcome to our " << item_name << " store. " << endl;
cout << "we have " << item_count << " " << item_name << "," << endl;
cout << "they cost $" << price_each << " each. " << endl; 

cout << "how many would you like to purchase? " ;
cin >> purchased;

total_price = purchased * price_each;

cout << "Total price is $" << total_price << endl;

return 0; 
}