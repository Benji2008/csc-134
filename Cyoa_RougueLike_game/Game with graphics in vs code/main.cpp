// main.cpp
// ISAAC DELVE - Binding of Isaac meets Roguelike CYOA
// Compile: g++ -std=c++14 -o isaac_delve main.cpp
// Run: ./isaac_delve

#include "isaac_delve.h"

int main() {
    srand(static_cast<unsigned int>(time(0)));
    main_menu();
    return 0;
}
