// CSC 134
// M3HW1 - Gold
// Hiltibidal
// 2026-03-23

#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
using namespace std;

int main()
{
    // =========================================================
    // Question 1: Simple Chatbot
    // =========================================================
    cout << "Question 1" << endl;
    cout << "-------------------------" << endl;

    string q1Answer;
    cout << "Hello, I'm a C++ program!" << endl;
    cout << "Do you like me? Please type yes or no." << endl;
    cin >> q1Answer;

    if (q1Answer == "yes")
    {
        cout << "That's great! I'm sure we'll get along." << endl;
    }
    else if (q1Answer == "no")
    {
        cout << "Well, maybe you'll learn to like me later." << endl;
    }
    else
    {
        cout << "If you're not sure... that's OK." << endl;
    }

    cout << endl;

    // =========================================================
    // Question 2: Receipt Calculator with Dine-In Tip
    // =========================================================
    cout << "Question 2" << endl;
    cout << "-------------------------" << endl;

    double mealPrice;
    int orderType;
    double taxRate = 0.075;   // 7.5% tax
    double tipRate = 0.15;    // 15% tip (dine-in only)

    cout << "Enter the price of the meal: $";
    cin >> mealPrice;

    cout << "Is the order dine in or takeaway?" << endl;
    cout << "Please enter 1 if the order is dine in, 2 if it is to go: ";
    cin >> orderType;

    double taxAmount = mealPrice * taxRate;
    double tipAmount = 0.0;
    double totalAmount;

    if (orderType == 1)
    {
        tipAmount = mealPrice * tipRate;
    }

    totalAmount = mealPrice + taxAmount + tipAmount;

    cout << endl;
    cout << "========== RECEIPT ==========" << endl;
    cout.setf(ios::fixed);
    cout.precision(2);
    cout << "Meal Price:  $" << mealPrice << endl;
    cout << "Tax (7.5%):  $" << taxAmount << endl;
    if (orderType == 1)
    {
        cout << "Tip (15%):   $" << tipAmount << endl;
    }
    else
    {
        cout << "Tip:          None (To Go)" << endl;
    }
    cout << "-----------------------------" << endl;
    cout << "Total Due:   $" << totalAmount << endl;
    cout << "=============================" << endl;

    cout << endl;

    // =========================================================
    // Question 3: Choose Your Own Adventure
    // =========================================================
    cout << "Question 3" << endl;
    cout << "-------------------------" << endl;

    int q3Choice1, q3Choice2;

    cout << "=== THE HAUNTED CASTLE ===" << endl;
    cout << endl;
    cout << "You stand at the entrance of a dark, crumbling castle." << endl;
    cout << "A low growl echoes from inside." << endl;
    cout << endl;
    cout << "What do you do?" << endl;
    cout << "  1. Enter the castle bravely." << endl;
    cout << "  2. Run away screaming." << endl;
    cout << "Enter 1 or 2: ";
    cin >> q3Choice1;

    if (q3Choice1 == 2)
    {
        cout << endl;
        cout << "You sprint back down the hill at full speed." << endl;
        cout << "You trip on a root and tumble into a ditch." << endl;
        cout << "A passing farmer laughs at you all the way home." << endl;
        cout << "GAME OVER. (Cowardice is rarely rewarded.)" << endl;
    }
    else
    {
        cout << endl;
        cout << "You step inside. Torches flicker along the stone walls." << endl;
        cout << "At the end of the hall, you see two doors." << endl;
        cout << "One is ornate gold. The other is plain iron." << endl;
        cout << endl;
        cout << "Which door do you open?" << endl;
        cout << "  1. The ornate gold door." << endl;
        cout << "  2. The plain iron door." << endl;
        cout << "Enter 1 or 2: ";
        cin >> q3Choice2;

        if (q3Choice2 == 1)
        {
            cout << endl;
            cout << "You push open the gold door. It swings wide with a creak." << endl;
            cout << "Inside sits a sleeping dragon, curled around a mountain of treasure." << endl;
            cout << "The door's groan wakes it. It opens one enormous eye." << endl;
            cout << "GAME OVER. You are toast. Literally." << endl;
        }
        else
        {
            cout << endl;
            cout << "You open the iron door to reveal a small, cozy library." << endl;
            cout << "An elderly wizard looks up from his book and smiles." << endl;
            cout << "\"Ah, a sensible adventurer! Here, take this treasure map.\"" << endl;
            cout << "VICTORY! Your adventure has only just begun." << endl;
        }
    }

    cout << endl;

    // =========================================================
    // Question 4: Math Practice (Random Addition)
    // =========================================================
    cout << "Question 4" << endl;
    cout << "-------------------------" << endl;

    srand(static_cast<unsigned int>(time(0)));

    int num1 = rand() % 10;  // 0-9
    int num2 = rand() % 10;  // 0-9
    int correctAnswer = num1 + num2;
    int userAnswer;

    cout << "Math Practice! Answer the addition problem below." << endl;
    cout << endl;
    cout << "What is " << num1 << " plus " << num2 << "?" << endl;
    cin >> userAnswer;

    if (userAnswer == correctAnswer)
    {
        cout << "Correct! Great job!" << endl;
    }
    else
    {
        cout << "Incorrect. The correct answer was " << correctAnswer << "." << endl;
    }

    cout << endl;

    return 0;
}