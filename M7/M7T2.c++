/*
csc 134 
hiltibic    
m7t2
*/

#include <iostream>
using namespace std;
string setName();
void setName(string& name);

int main (){
    //pointer practice 
    // & is reference
    // * is deference 
    string name = "stevie";
    string * pName = &name; 
    setName (name);

    cout << "name  = " << name << endl;
    cout << "pName  = " << pName << endl; 
    cout << "*pName  = " << *pName << endl; 
}
//full functions
string setName(){
    string name; 
    cout << "Enter name " ;
    cin >> name;
    return name;
}
void setName(string& name){
    cout << "enter name: ";
    cin >> name;
}