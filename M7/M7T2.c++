/*
csc 134 
hiltibic    
m7t2
*/

#include <iostream>
using namespace std;
//
string setName();
void setName(string& name);

 //header
 #include "rectangle.h"

int main (){
    //pointer practice 
    // & is reference
    // * is deference 
    string name = "stevie";
    string * pName = &name; 
    //setName (name);

    //p2
    Rectangle r1; 
    double w, l;
    cout << "Enter width and length, separated by a space: ";
    cin >> w >> l;
    r1.setWidth(w);
    r1.setLength(l);
    cout << "area is: " << r1.getArea() << endl;
    r1.drawrectangle();

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